package net.redouan.planpoker;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Voter {
    private String sid;
    private String name;
    private int vote;

    @Override
    public String toString(){
        return sid+"++"+name+"++"+vote;
    }

}
